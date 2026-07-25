require("dotenv").config();

const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const app = express();

app.use(
  cors({
    origin: true,
    credentials: true
  })
);

app.use(express.json());

const PORT = process.env.PORT || 3001;

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error(
    "Falta configurar JWT_SECRET en las variables de entorno."
  );
}


/* =========================
   HEALTH CHECK
========================= */

app.get("/api/health", (req, res) => {

  res.json({
    ok: true,
    service: "Royal Casino API"
  });

});


/* =========================
   MIDDLEWARE DE AUTENTICACIÓN
========================= */

function authenticate(req, res, next) {

  const authorization =
    req.headers.authorization || "";

  if (!authorization.startsWith("Bearer ")) {

    return res.status(401).json({
      error: "No autenticado."
    });

  }


  const token =
    authorization.substring(7);


  try {

    const decoded =
      jwt.verify(
        token,
        JWT_SECRET
      );


    req.user = decoded;

    next();


  } catch (error) {

    return res.status(401).json({
      error: "Sesión inválida o expirada."
    });

  }

}


/* =========================
   CREAR TOKEN
========================= */

function createToken(user) {

  return jwt.sign(
    {
      sub: user.id
    },

    JWT_SECRET,

    {
      expiresIn: "7d"
    }
  );

}


/* =========================
   REGISTRO
========================= */

app.post(
  "/api/auth/register",

  async (req, res) => {

    try {

      const {
        username,
        email,
        password
      } = req.body;


      if (
        !username ||
        !email ||
        !password
      ) {

        return res.status(400).json({
          error:
            "Usuario, correo y contraseña son obligatorios."
        });

      }


      if (password.length < 8) {

        return res.status(400).json({
          error:
            "La contraseña debe tener al menos 8 caracteres."
        });

      }


      const existingUser =
        await prisma.user.findFirst({
          where: {
            OR: [
              {
                username: username
              },
              {
                email: email
              }
            ]
          }
        });


      if (existingUser) {

        return res.status(409).json({
          error:
            "El usuario o correo ya está registrado."
        });

      }


      const passwordHash =
        await bcrypt.hash(
          password,
          12
        );


      const result =
        await prisma.$transaction(
          async (transaction) => {

            const user =
              await transaction.user.create({

                data: {

                  username,

                  email,

                  passwordHash,

                  wallet: {

                    create: {

                      balance: 100000

                    }

                  }

                },

                include: {

                  wallet: true

                }

              });


            await transaction.walletTransaction.create({

              data: {

                userId: user.id,

                type: "WELCOME_BONUS",

                amount: 100000,

                balanceAfter: 100000

              }

            });


            return user;

          }
        );


      const token =
        createToken(result);


      return res.status(201).json({

        token,

        user: {

          id: result.id,

          username:
            result.username,

          email:
            result.email,

          balance:
            result.wallet.balance

        }

      });


    } catch (error) {

      console.error(
        "REGISTER ERROR:",
        error
      );


      return res.status(500).json({

        error:
          "No se pudo crear la cuenta."

      });

    }

  }

);


/* =========================
   LOGIN
========================= */

app.post(
  "/api/auth/login",

  async (req, res) => {

    try {

      const {
        email,
        password
      } = req.body;


      if (
        !email ||
        !password
      ) {

        return res.status(400).json({

          error:
            "Correo y contraseña son obligatorios."

        });

      }


      const user =
        await prisma.user.findUnique({

          where: {
            email
          },

          include: {

            wallet: true

          }

        });


      if (!user) {

        return res.status(401).json({

          error:
            "Correo o contraseña incorrectos."

        });

      }


      const passwordCorrect =
        await bcrypt.compare(
          password,
          user.passwordHash
        );


      if (!passwordCorrect) {

        return res.status(401).json({

          error:
            "Correo o contraseña incorrectos."

        });

      }


      const token =
        createToken(user);


      return res.json({

        token,

        user: {

          id: user.id,

          username:
            user.username,

          email:
            user.email,

          balance:
            user.wallet.balance

        }

      });


    } catch (error) {

      console.error(
        "LOGIN ERROR:",
        error
      );


      return res.status(500).json({

        error:
          "No se pudo iniciar sesión."

      });

    }

  }

);


/* =========================
   USUARIO ACTUAL
========================= */

app.get(
  "/api/auth/me",

  authenticate,

  async (req, res) => {

    try {

      const user =
        await prisma.user.findUnique({

          where: {

            id:
              req.user.sub

          },

          include: {

            wallet: true

          }

        });


      if (!user) {

        return res.status(404).json({

          error:
            "Usuario no encontrado."

        });

      }


      return res.json({

        user: {

          id: user.id,

          username:
            user.username,

          email:
            user.email,

          balance:
            user.wallet.balance

        }

      });


    } catch (error) {

      return res.status(500).json({

        error:
          "No se pudo obtener el usuario."

      });

    }

  }

);


/* =========================
   CONSULTAR WALLET
========================= */

app.get(
  "/api/wallet",

  authenticate,

  async (req, res) => {

    try {

      const wallet =
        await prisma.wallet.findUnique({

          where: {

            userId:
              req.user.sub

          }

        });


      if (!wallet) {

        return res.status(404).json({

          error:
            "Wallet no encontrada."

        });

      }


      return res.json({

        balance:
          wallet.balance

      });


    } catch (error) {

      return res.status(500).json({

        error:
          "No se pudo obtener el balance."

      });

    }

  }

);


/* =========================
   HISTORIAL DE WALLET
========================= */

app.get(
  "/api/wallet/transactions",

  authenticate,

  async (req, res) => {

    try {

      const transactions =
        await prisma.walletTransaction.findMany({

          where: {

            userId:
              req.user.sub

          },

          orderBy: {

            createdAt:
              "desc"

          },

          take: 100

        });


      return res.json({

        transactions

      });


    } catch (error) {

      return res.status(500).json({

        error:
          "No se pudo obtener el historial."

      });

    }

  }

);


/* =========================
   BONO DIARIO
========================= */

app.post(
  "/api/rewards/daily",

  authenticate,

  async (req, res) => {

    const reward =
      100;


    try {

      const result =
        await prisma.$transaction(

          async (transaction) => {

            const wallet =
              await transaction.wallet.findUnique({

                where: {

                  userId:
                    req.user.sub

                }

              });


            if (!wallet) {

              throw new Error(
                "WALLET_NOT_FOUND"
              );

            }


            const lastBonus =
              await transaction.walletTransaction.findFirst({

                where: {

                  userId:
                    req.user.sub,

                  type:
                    "DAILY_BONUS",

                  createdAt: {

                    gte:
                      new Date(
                        Date.now() -
                        24 *
                        60 *
                        60 *
                        1000
                      )

                  }

                }

              });


            if (lastBonus) {

              throw new Error(
                "BONUS_ALREADY_CLAIMED"
              );

            }


            const newBalance =
              wallet.balance +
              reward;


            await transaction.wallet.update({

              where: {

                userId:
                  req.user.sub

              },

              data: {

                balance:
                  newBalance

              }

            });


            await transaction.walletTransaction.create({

              data: {

                userId:
                  req.user.sub,

                type:
                  "DAILY_BONUS",

                amount:
                  reward,

                balanceAfter:
                  newBalance

              }

            });


            return newBalance;

          }

        );


      return res.json({

        balance:
          result,

        reward

      });


    } catch (error) {

      if (
        error.message ===
        "BONUS_ALREADY_CLAIMED"
      ) {

        return res.status(429).json({

          error:
            "Ya reclamaste el bono durante las últimas 24 horas."

        });

      }


      if (
        error.message ===
        "WALLET_NOT_FOUND"
      ) {

        return res.status(404).json({

          error:
            "Wallet no encontrada."

        });

      }


      console.error(
        "BONUS ERROR:",
        error
      );


      return res.status(500).json({

        error:
          "No se pudo procesar el bono."

      });

    }

  }

);


/* =========================
   INICIAR SERVIDOR
========================= */

app.listen(
  PORT,

  () => {

    console.log(
      `Royal Casino API funcionando en el puerto ${PORT}`
    );

  }

);

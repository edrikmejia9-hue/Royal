const API = "http://localhost:3001/api";

let authMode = "login";

let token = localStorage.getItem("royalToken");


function showMessage(message) {
  alert(message);
}


function openLogin() {

  authMode = "login";

  document.getElementById("authTitle").textContent =
    "INICIAR SESIÓN";

  document.getElementById("username").style.display =
    "none";

  document.getElementById("authSwitch").textContent =
    "¿No tienes cuenta? Regístrate";

  document.getElementById("authModal").style.display =
    "grid";
}


function openRegister() {

  authMode = "register";

  document.getElementById("authTitle").textContent =
    "CREAR CUENTA";

  document.getElementById("username").style.display =
    "block";

  document.getElementById("authSwitch").textContent =
    "¿Ya tienes cuenta? Inicia sesión";

  document.getElementById("authModal").style.display =
    "grid";
}


function toggleAuth() {

  if (authMode === "login") {

    openRegister();

  } else {

    openLogin();

  }

}


function closeAuth() {

  document.getElementById("authModal").style.display =
    "none";

}


async function submitAuth() {

  const username =
    document.getElementById("username").value.trim();

  const email =
    document.getElementById("email").value.trim();

  const password =
    document.getElementById("password").value;


  if (!email || !password) {

    showMessage(
      "Completa tu correo y contraseña."
    );

    return;

  }


  if (
    authMode === "register" &&
    !username
  ) {

    showMessage(
      "Escribe un nombre de usuario."
    );

    return;

  }


  const endpoint =
    authMode === "login"
      ? "/auth/login"
      : "/auth/register";


  const body =
    authMode === "login"

      ? {
          email: email,
          password: password
        }

      : {
          username: username,
          email: email,
          password: password
        };


  try {

    const response =
      await fetch(
        API + endpoint,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body:
            JSON.stringify(body)
        }
      );


    const data =
      await response.json();


    if (!response.ok) {

      showMessage(
        data.error ||
        "Error de autenticación."
      );

      return;

    }


    token =
      data.token;


    localStorage.setItem(
      "royalToken",
      token
    );


    closeAuth();

    await loadUser();


    if (authMode === "login") {

      showMessage(
        "Sesión iniciada correctamente."
      );

    } else {

      showMessage(
        "Cuenta creada correctamente."
      );

    }


  } catch (error) {

    console.error(error);

    showMessage(
      "No se pudo conectar con el servidor."
    );

  }

}


async function loadUser() {

  if (!token) {

    return;

  }


  try {

    const response =
      await fetch(
        API + "/auth/me",
        {
          headers: {
            Authorization:
              "Bearer " + token
          }
        }
      );


    if (!response.ok) {

      logout(false);

      return;

    }


    const data =
      await response.json();


    document.getElementById("user").textContent =
      "♛ " +
      data.user.username;


    document.getElementById("balance").textContent =
      data.user.balance.toLocaleString("es-MX");


    const loginButton =
      document.getElementById(
        "loginButton"
      );


    loginButton.textContent =
      "CERRAR SESIÓN";


    loginButton.onclick =
      function() {

        logout(true);

      };


    document.getElementById(
      "registerButton"
    ).style.display =
      "none";


  } catch (error) {

    console.error(error);

  }

}


async function claimBonus() {

  if (!token) {

    showMessage(
      "Primero inicia sesión."
    );

    return;

  }


  try {

    const response =
      await fetch(
        API + "/rewards/daily",
        {
          method: "POST",

          headers: {
            Authorization:
              "Bearer " + token
          }
        }
      );


    const data =
      await response.json();


    if (!response.ok) {

      showMessage(
        data.error ||
        "No se pudo reclamar el bono."
      );

      return;

    }


    document.getElementById(
      "balance"
    ).textContent =
      data.balance.toLocaleString(
        "es-MX"
      );


    showMessage(
      "🎁 Recibiste " +
      data.reward.toLocaleString(
        "es-MX"
      ) +
      " fichas virtuales."
    );


  } catch (error) {

    console.error(error);

    showMessage(
      "No se pudo conectar con el servidor."
    );

  }

}


function logout(showMessageBox) {

  token = null;

  localStorage.removeItem(
    "royalToken"
  );


  document.getElementById(
    "user"
  ).textContent = "";


  document.getElementById(
    "balance"
  ).textContent = "—";


  const loginButton =
    document.getElementById(
      "loginButton"
    );


  loginButton.textContent =
    "INICIAR SESIÓN";


  loginButton.onclick =
    openLogin;


  document.getElementById(
    "registerButton"
  ).style.display =
    "inline-block";


  if (showMessageBox) {

    showMessage(
      "Sesión cerrada."
    );

  }

}


loadUser();

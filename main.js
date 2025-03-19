import MapView from "@arcgis/core/views/MapView.js";
import Portal from "@arcgis/core/portal/Portal.js";
import OAuthInfo from "@arcgis/core/identity/OAuthInfo.js";
import esriId from "@arcgis/core/identity/IdentityManager.js";
import esriRequest from "@arcgis/core/request.js";

const oAuthOptions = {
  // https://prof-services.maps.arcgis.com/home/item.html?id=bd2f2c00808747c2a5bee10040f0cc31#overview
  appId: "5zExhoFVwOyHuQaL",
  portalUrl: "https://prof-services.maps.arcgis.com", // INCLUDE IF USING ARCGIS ENTERPRISE!
  popup: false,
};

const checkSignIn = async () => {
  try {
    const credential = await esriId.checkSignInStatus(
      oAuthOptions.portalUrl + "/sharing"
    );
    console.log("credential", credential);
    const portal = new Portal({
      authMode: "immediate",
    });

    await portal.load();
    return portal;
  } catch (E) {
    console.log("NOT SIGNED IN - SHOW LOGIN BUTTON");
    return false;
  }
};

const signOut = () => {
  esriId.destroyCredentials();
  window.location.reload();
};
const signIn = async () => {
  // If the user is not signed in, generate a new credential.
  await esriId.getCredential(oAuthOptions.portalUrl + "/sharing", {
    oAuthPopupConfirmation: false,
  });

  await updateUI();
};

const updateUI = async () => {
  const portal = await checkSignIn();

  if (portal) {
    loginButtonWrapper.classList.add("hidden");
    wrapper.classList.remove("hidden");
  }
};

const exportToFile = (itemId, exportType) => {
  const requestOptions = {
    responseType: "json",
    query: {
      f: "json",
      exportType,
    },
  };

  return esriRequest(
    `https://www.arcgis.com/sharing/rest/content/features/export?itemID=${itemId}`,
    requestOptions
  ).then((response) => {
    console.log("RESPONSE:", response);
    return response.data.resultUrl;
  });
};

const main = async () => {
  const info = new OAuthInfo(oAuthOptions);
  esriId.registerOAuthInfos([info]);

  await updateUI();

  // // When the login button is clicked, start the login process:
  loginButton.addEventListener("click", () => {
    signIn();
  });

  logoutButton.addEventListener("click", () => {
    signOut();
  });

  // When the "create service" button is clicked, create the feature service
  exportButton.addEventListener("click", async () => {
    const portal = await checkSignIn();
    if (portal && itemIdInput.value !== "") {
      // createFS(portal, itemIdInput.value);
      console.log("TODO: EXPORT!");
      const resultUrl = await exportToFile(
        itemIdInput.value,
        exportTypeInput.value
      );
      console.log("RESULT:", resultUrl);
    } else {
      console.error("Invalid inputs.");
    }
  });
};

main();

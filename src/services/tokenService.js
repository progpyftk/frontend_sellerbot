// src/services/tokenService.js
export const getAccessToken = () => sessionStorage.getItem("accessToken");
export const setAccessToken = (token) =>
  sessionStorage.setItem("accessToken", token);

export const getRefreshToken = () => localStorage.getItem("refreshToken");
export const setRefreshToken = (token) =>
  localStorage.setItem("refreshToken", token);

export const clearTokens = () => {
  sessionStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
};

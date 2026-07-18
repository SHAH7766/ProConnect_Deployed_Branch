import { jwtDecode } from "jwt-decode";

export const getTokenExpiration = (token) => {
  if (!token) return null;

  const decoded = jwtDecode(token);
  return decoded.exp * 1000; // convert to ms
};

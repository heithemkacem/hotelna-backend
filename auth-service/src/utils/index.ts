import bcrypt from "bcryptjs";
import { ValidationError } from "joi";
import config from "../config/config";
// Error Handling Class

class ApiError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(
    statusCode: number,
    message: string | undefined,
    isOperational = true,
    stack = ""
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

// Encrypt Password
const encryptPassword = async (password: string): Promise<string> => {
  const encryptedPassword = await bcrypt.hash(password, 12);
  return encryptedPassword;
};

// Compare Passwords
const isPasswordMatch = async (
  password: string,
  userPassword: string
): Promise<boolean> => {
  const result = await bcrypt.compare(password, userPassword);
  return result;
};

// Success Response
const successResponse = (
  res: any,
  message = "",
  data: Record<string, any> = {}
) => {
  return res.status(200).json({
    ok: true,
    status: "Success",
    message,
    data,
  });
};

// Error Response
const errorResponse = (
  res: any,
  message: string | ValidationError,
  statusCode = 400
) => {
  return res.status(statusCode).json({
    ok: false,
    status: "Failed",
    message,
  });
};

export const validateToken = async (
  provider: "GOOGLE" | "FACEBOOK",
  token: string
) => {
  if (provider === "GOOGLE") {
    return validateGoogleToken(token);
  } else if (provider === "FACEBOOK") {
    return validateFacebookToken(token);
  }
  throw new Error("Invalid_provider");
};
export const validateGoogleToken = async (idToken: string) => {
  const googleApiUrl = `https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`;

  try {
    const response = await fetch(googleApiUrl);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.error_description || "Failed to validate Google token"
      );
    }

    // Ensure the token is issued to one of your client IDs
    const audience = [
      config.ANDROID_CLIENT_ID,
      config.IOS_CLIENT_ID,
      config.WEB_CLIENT_ID,
    ];

    if (!audience.includes(data.aud)) {
      throw new Error("Token audience mismatch");
    }

    // Extract necessary information
    const { email, name } = data;

    if (!email || !name) {
      throw new Error("Email or name not provided by Google");
    }

    return { email, name };
  } catch (error) {
    console.error("Error validating Google ID token:", error);
    throw new Error("Failed to validate Google token");
  }
};
const validateFacebookToken = async (accessToken: string) => {
  // Include the 'name' field in the request
  const facebookApiUrl = `https://graph.facebook.com/v13.0/me?fields=id,name,email&access_token=${accessToken}`;

  try {
    const response = await fetch(facebookApiUrl);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.error?.message || "Failed to fetch user data from Facebook API"
      );
    }

    // Ensure both name and email are present in the response
    const { name, email } = data;
    if (!name || !email) {
      throw new Error("Name or email not provided by Facebook");
    }

    return { name, email };
  } catch (error) {
    console.error("Facebook token validation failed:", error);
    throw new Error("Facebook token validation failed");
  }
};
// Function to generate a 4-digit OTP
const generateOTP = (): string => {
  const otp = Math.floor(1000 + Math.random() * 9000).toString(); // Generates a 4-digit OTP
  return otp;
};

export {
  ApiError,
  encryptPassword,
  isPasswordMatch,
  successResponse,
  errorResponse,
  generateOTP,
};

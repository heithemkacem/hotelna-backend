import bcrypt from "bcryptjs";
import { ValidationError } from "joi";
import config from "../config/config";
import { OAuth2Client } from "google-auth-library";
const oAuth2Client = new OAuth2Client(config.WEB_CLIENT_ID);
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
  try {
    // Verify the ID token using Google's official library
    const ticket = await oAuth2Client.verifyIdToken({
      idToken,
      audience: config.WEB_CLIENT_ID, // Verify this matches your client ID
    });

    // Get the user payload from the ticket
    const payload = ticket.getPayload();

    if (!payload) {
      throw new Error("Invalid token payload");
    }

    // Verify the token audience matches your client ID
    if (!payload.aud.includes(config.WEB_CLIENT_ID as string)) {
      throw new Error("Token audience mismatch");
    }

    // Verify the token issuer
    if (
      payload.iss !== "https://accounts.google.com" &&
      payload.iss !== "accounts.google.com"
    ) {
      throw new Error("Invalid token issuer");
    }

    // Check for required fields
    if (!payload.email || !payload.name) {
      throw new Error("Missing required user information");
    }

    // Return standardized user information
    return {
      email: payload.email,
      name: payload.name,
      picture: payload.picture,
      email_verified: payload.email_verified,
    };
  } catch (error) {
    console.error("Google token validation error:", error);

    // Handle specific error cases
    if (error instanceof Error) {
      if (error.message.includes("Token used too late")) {
        throw new Error("Expired token");
      }
      if (error.message.includes("Malformed")) {
        throw new Error("Invalid token format");
      }
    }

    throw new Error("Authentication failed: Invalid Google token");
  }
};
const validateFacebookToken = async (accessToken: string) => {
  // Include the 'name' field in the request
  const facebookApiUrl = `https://graph.facebook.com/v13.0/me?fields=id,name,email&access_token=${accessToken}`;

  try {
    const response = await fetch(facebookApiUrl);
    const data = await response.json();
    console.log(data);
    if (!response.ok) {
      throw new Error(
        data.error?.message || "Failed to fetch user data from Facebook API"
      );
    }

    // Ensure both name and email are present in the response
    const { name, email } = data;
    console.log(data);
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

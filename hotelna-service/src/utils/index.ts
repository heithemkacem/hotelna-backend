import bcrypt from "bcryptjs";

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
const errorResponse = (res: any, message = "", statusCode = 400) => {
  return res.status(statusCode).json({
    ok: false,
    status: "Failed",
    message,
  });
};

// Function to generate a 6-digit OTP
const generateOTP = (): string => {
  const otp = Math.floor(100000 + Math.random() * 900000).toString(); // Generates a 6-digit OTP
  return otp;
};
 const generatePassword = (length: number = 8): string => {
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * chars.length);
    password += chars[randomIndex];
  }
  return password;
};

export {
  ApiError,
  encryptPassword,
  isPasswordMatch,
  successResponse,
  errorResponse,
  generateOTP,
  generatePassword
};

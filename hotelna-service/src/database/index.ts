import Profile, { IProfile } from "./models/profile/profile";
import Admin, { IAdmin } from "./models/admin/admin";
import Client, { IClient } from "./models/client/client";
import Hotel, { IHotel } from "./models/hotel/hotel";
import OTP, { IOTP } from "./models/otp/otp";
import { connectDB } from "./connection";
import Service from "./models/service/service";
import Settings from "./models/settings/settings";

export {
  Profile,
  IProfile,
  Admin,
  IAdmin,
  Client,
  IClient,
  Hotel,
  IHotel,
  OTP,
  IOTP,
  connectDB,
  Service,
  Settings
};

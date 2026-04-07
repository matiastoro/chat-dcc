import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      rut?: string;
      roles?: string[];
    };
  }

  interface User {
    rut?: string;
    roles?: string[];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    rut?: string;
    roles?: string[];
  }
}

import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { JwtService } from "@nestjs/jwt";
import { ConflictException, UnauthorizedException } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { OnlineUserService } from "./online-user.service";
import { User } from "../entities/user.entity";
import { RefreshToken } from "../entities/refresh-token.entity";
import * as bcrypt from "bcryptjs";

jest.mock("bcryptjs");

describe("AuthService", () => {
  let service: AuthService;

  const mockUserRepo = {
    findOne: jest.fn(),
    create: jest.fn((dto: Record<string, unknown>) => dto),
    save: jest.fn((entity: Record<string, unknown>) =>
      Promise.resolve({ ...entity, id: 1 }),
    ),
  };

  const mockRefreshTokenRepo = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
  };

  const mockJwtService = {
    signAsync: jest.fn(() => Promise.resolve("mock-jwt-token")),
  };

  const mockOnlineUsers = {
    clearRevoked: jest.fn(),
    isRevoked: jest.fn(() => false),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: mockUserRepo },
        {
          provide: getRepositoryToken(RefreshToken),
          useValue: mockRefreshTokenRepo,
        },
        { provide: JwtService, useValue: mockJwtService },
        { provide: OnlineUserService, useValue: mockOnlineUsers },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("register", () => {
    it("should register a new user successfully", async () => {
      mockUserRepo.findOne.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue("hashed-password");

      const result = await service.register({
        username: "testuser",
        email: "test@example.com",
        password: "password123",
      });

      expect(result).toHaveProperty("token");
      expect(result).toHaveProperty("user");
      expect(result.user).not.toHaveProperty("passwordHash");
      expect(mockUserRepo.save).toHaveBeenCalled();
    });

    it("should throw ConflictException when username exists", async () => {
      mockUserRepo.findOne.mockResolvedValue({ id: 1, username: "existing" });

      await expect(
        service.register({
          username: "existing",
          email: "new@example.com",
          password: "password123",
        }),
      ).rejects.toThrow(ConflictException);
    });

    it("should hash the password before saving", async () => {
      mockUserRepo.findOne.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue("hashed-password");

      await service.register({
        username: "testuser",
        email: "test@example.com",
        password: "plain-password",
      });

      expect(bcrypt.hash).toHaveBeenCalledWith("plain-password", 10);
      expect(mockUserRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ passwordHash: "hashed-password" }),
      );
    });

    it("should handle optional email", async () => {
      mockUserRepo.findOne.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue("hashed-password");

      const result = await service.register({
        username: "testuser",
        password: "password123",
      });

      expect(result).toBeDefined();
      expect(mockUserRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ email: null }),
      );
    });
  });

  describe("login", () => {
    it("should login with correct credentials", async () => {
      const mockUser = {
        id: 1,
        username: "testuser",
        passwordHash: "hashed-password",
        role: "user",
      };
      mockUserRepo.findOne.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.login({
        username: "testuser",
        password: "password123",
      });

      expect(result).toHaveProperty("token", "mock-jwt-token");
      expect(result).toHaveProperty("user");
      expect(result.user).not.toHaveProperty("passwordHash");
    });

    it("should throw UnauthorizedException when user not found", async () => {
      mockUserRepo.findOne.mockResolvedValue(null);

      await expect(
        service.login({ username: "nonexistent", password: "password123" }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it("should throw UnauthorizedException when password is wrong", async () => {
      mockUserRepo.findOne.mockResolvedValue({
        id: 1,
        username: "testuser",
        passwordHash: "hashed-password",
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.login({ username: "testuser", password: "wrong-password" }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it("should throw UnauthorizedException when user has no passwordHash", async () => {
      mockUserRepo.findOne.mockResolvedValue({
        id: 1,
        username: "testuser",
        passwordHash: null,
      });

      await expect(
        service.login({ username: "testuser", password: "password123" }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe("me", () => {
    it("should return user info without token (cookie-only session)", async () => {
      const mockUser = {
        id: 1,
        username: "testuser",
        passwordHash: "hashed",
        role: "user",
      };
      mockUserRepo.findOne.mockResolvedValue(mockUser);

      const result = await service.me(1);
      expect(result).toHaveProperty("id");
      expect(result).not.toHaveProperty("token");
      expect(result).not.toHaveProperty("passwordHash");
    });

    it("should throw UnauthorizedException when user not found", async () => {
      mockUserRepo.findOne.mockResolvedValue(null);

      await expect(service.me(999)).rejects.toThrow(UnauthorizedException);
    });
  });
});

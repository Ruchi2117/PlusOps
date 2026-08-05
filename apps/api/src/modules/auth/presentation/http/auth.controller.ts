import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Inject,
  Ip,
  Post,
  Req,
  Res
} from "@nestjs/common";
import {
  ApiBody,
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse
} from "@nestjs/swagger";
import type { LoginResponse, RefreshResponse, SignupResponse } from "@plusops/contracts";
import type { Request, Response } from "express";

import { LoginUseCase } from "../../application/use-cases/login.use-case";
import { LogoutUseCase } from "../../application/use-cases/logout.use-case";
import { RefreshSessionUseCase } from "../../application/use-cases/refresh-session.use-case";
import { SignupUseCase } from "../../application/use-cases/signup.use-case";
import { LoginDto } from "./dtos/login.dto";
import { SignupDto } from "./dtos/signup.dto";
import { RefreshTokenCookieService } from "./refresh-token-cookie.service";

@ApiTags("Auth")
@Controller({
  path: "auth",
  version: "1"
})
export class AuthController {
  constructor(
    @Inject(SignupUseCase)
    private readonly signupUseCase: SignupUseCase,
    @Inject(LoginUseCase)
    private readonly loginUseCase: LoginUseCase,
    @Inject(LogoutUseCase)
    private readonly logoutUseCase: LogoutUseCase,
    @Inject(RefreshSessionUseCase)
    private readonly refreshSessionUseCase: RefreshSessionUseCase,
    @Inject(RefreshTokenCookieService)
    private readonly refreshTokenCookieService: RefreshTokenCookieService
  ) {}

  @Post("signup")
  @HttpCode(HttpStatus.CREATED)
  @ApiBody({ type: SignupDto })
  @ApiCreatedResponse({ description: "Account created. Email verification is still required." })
  @ApiBadRequestResponse({ description: "Invalid signup payload." })
  @ApiConflictResponse({ description: "Account could not be created with those details." })
  async signup(@Body() body: SignupDto): Promise<SignupResponse> {
    return this.signupUseCase.execute(body);
  }

  @Post("login")
  @HttpCode(HttpStatus.OK)
  @ApiBody({ type: LoginDto })
  @ApiOkResponse({ description: "Authenticated session created." })
  @ApiBadRequestResponse({ description: "Invalid login payload." })
  @ApiUnauthorizedResponse({ description: "Invalid email or password." })
  async login(
    @Body() body: LoginDto,
    @Ip() ipAddress: string,
    @Headers("user-agent") userAgent: string | undefined,
    @Res({ passthrough: true }) response: Response
  ): Promise<LoginResponse> {
    const result = await this.loginUseCase.execute(body, {
      ipAddress: ipAddress || null,
      userAgent: userAgent ?? null
    });

    this.refreshTokenCookieService.setRefreshTokenCookie(
      response,
      result.refreshToken,
      result.refreshTokenExpiresAt
    );

    return result.response;
  }

  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: "Session refreshed and refresh token rotated." })
  @ApiUnauthorizedResponse({ description: "Invalid refresh session." })
  async refresh(
    @Req() request: Request,
    @Ip() ipAddress: string,
    @Headers("user-agent") userAgent: string | undefined,
    @Res({ passthrough: true }) response: Response
  ): Promise<RefreshResponse> {
    const result = await this.refreshSessionUseCase.execute(
      {
        refreshToken: this.refreshTokenCookieService.getRefreshTokenFromRequest(request)
      },
      {
        ipAddress: ipAddress || null,
        userAgent: userAgent ?? null
      }
    );

    this.refreshTokenCookieService.setRefreshTokenCookie(
      response,
      result.refreshToken,
      result.refreshTokenExpiresAt
    );

    return result.response;
  }

  @Post("logout")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: "Session revoked and refresh cookie cleared." })
  async logout(
    @Req() request: Request,
    @Ip() ipAddress: string,
    @Headers("user-agent") userAgent: string | undefined,
    @Res({ passthrough: true }) response: Response
  ): Promise<void> {
    await this.logoutUseCase.execute(
      {
        refreshToken: this.refreshTokenCookieService.getRefreshTokenFromRequest(request)
      },
      {
        ipAddress: ipAddress || null,
        userAgent: userAgent ?? null
      }
    );

    this.refreshTokenCookieService.clearRefreshTokenCookie(response);
  }
}

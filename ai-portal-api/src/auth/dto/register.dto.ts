import {
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @IsString()
  @MinLength(2)
  @MaxLength(32)
  username: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password: string;
}

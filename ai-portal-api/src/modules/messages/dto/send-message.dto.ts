import { IsString, MaxLength, MinLength } from 'class-validator';

export class SendMessageDto {
  /** 收件人用户名 */
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  to: string;

  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  content: string;
}

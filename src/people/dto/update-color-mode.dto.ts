import { IsIn } from 'class-validator';

export class UpdateColorModeDto {
  @IsIn(['light', 'dark'])
  colorMode: 'light' | 'dark';
}

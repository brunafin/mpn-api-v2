import { Transform } from "class-transformer";
import { IsDate, IsString } from "class-validator";

export class CounterQueryDto {
    @IsString()
    companyPublicId: string;

    @Transform(({ value }) => new Date(value))
    @IsDate()
    date: Date;
}

export interface IAvailableHours {
    date: Date;
    startHour: string;
    price: number;
    courtName: string;
    courtSports: {label: string; value: string}[];
    dayOfWeekAbb: string;
}

export interface IWhereToPlayCourtList {
    logoUrl: string;
    name: string;
    phone: string;
    city?: string;
    address: string;
    instagramUrl: string;
    courts: {
        courtName: string;
        courtSports: {label: string; value: string}[];
        schedules: IAvailableHours[];
    }[]
}

export interface ICourt {
    courtName: string;
    courtSports: {label: string; value: string}[];
    schedules: IAvailableHours[];
}

export interface IDetailsCourt extends IWhereToPlayCourtList {
    characteristics: string[];
    photoHighlightUrl: string;
}
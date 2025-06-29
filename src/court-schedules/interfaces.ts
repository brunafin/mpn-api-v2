export interface IPublicCourtSchedule {
    logoUrl: string;
    name: string;
    phone: string;
    address: string;
    sports: string;
    instagramUrl: string;
    availableHours: {
        date: Date;
        startHour: string;
        price: number;
        courtName: string;
        courtSports: string;
        dayOfWeekAbb: string;
    }[]
}
export class CreateBatchGoogleCourtDto {
  city: string;
  places: {
    id: string;
    nationalPhoneNumber: string;
    formattedAddress: string;
    displayName: {
      text: string;
      languageCode: string;
    };
  }[];
}

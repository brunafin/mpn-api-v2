import { ReservationStatusEnum } from 'src/court-schedules/court-schedules.service';
import { CourtSchedule } from 'src/court-schedules/entities/court-schedule.entity';

/**
 * Determines the status of a court schedule based on its properties.
 *
 * @param courtSchedule - An object representing the court schedule.
 * @returns A string representing the status of the court schedule:
 * - `'fixed'` if the schedule is fixed.
 * - `'reserved'` if the schedule has a reservation.
 * - `'available'` if the schedule is available.
 * - `'inactive'` if the schedule is neither available nor reserved.
 * - `'unknown'` if none of the above conditions are met.
 */

export const getStatusCourtSchedule = (
  courtSchedule: CourtSchedule,
): ReservationStatusEnum => {
  if (courtSchedule.is_fixed) {
    return ReservationStatusEnum.FIXED;
  }
  if (courtSchedule.reservation && courtSchedule.reservation.is_prepaid) {
    return ReservationStatusEnum.PREPAID;
  }
  if (courtSchedule.reservation) {
    return ReservationStatusEnum.RESERVED;
  }
  if (courtSchedule.available) {
    return ReservationStatusEnum.AVAILABLE;
  }
  if (!courtSchedule.available && !courtSchedule.reservation) {
    return ReservationStatusEnum.INACTIVE;
  }
  return ReservationStatusEnum.UNKNOWN;
};

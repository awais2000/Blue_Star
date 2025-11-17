import moment from "moment-timezone";

/**
 * @param dateInput
 * @returns
 */

export const formatDateTime = (dateInput: any): string => {
  return moment(dateInput)
    .tz("Asia/Dubai")
    .format("hh:mm A"); 
};


export function formatDateToDDMMYYYY(dateInput: string | Date): string {
  const date = new Date(dateInput);

  if (isNaN(date.getTime())) {
    throw new Error("Invalid date passed to formatDateToDDMMYYYY()");
  }

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();

  return `${day}:${month}:${year}`;
}

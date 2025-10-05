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

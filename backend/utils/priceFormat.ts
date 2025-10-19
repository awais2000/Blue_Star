export const formatCurrency = (value: number | string | undefined | null): string => {
    // 1. Convert to a number and handle invalid inputs
    const num = Number(value) || 0;

    const fixedNum = num.toFixed(0); // e.g., "112.00"


    return parseFloat(fixedNum).toString();
};
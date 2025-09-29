
export const roundToTwoDecimals = (num: number): number => {
    return Math.round(num * 100) / 100;
};


export const formatCurrency = (value: number | string | undefined | null): string => {
    const num = Number(value) || 0;
    const fixedNum = num.toFixed(2);
    return parseFloat(fixedNum).toString();
};
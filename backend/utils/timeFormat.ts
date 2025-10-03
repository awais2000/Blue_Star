export const formatDateTime = (date: Date): string => {
    const pad = (num: number): string => num.toString().padStart(2, '0');

    const currentHours = date.getHours();
    const minutes = pad(date.getMinutes());
    const seconds = pad(date.getSeconds());
    
    const period = currentHours >= 12 ? 'PM' : 'AM';
    

    const displayHours = pad(currentHours % 12 || 12); 

    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    
    const milliseconds = date.getMilliseconds().toString().padStart(3, '0');


    // Final format: YYYY-MM-DD HH:MM:SS.ms (12-hour time)
    return `${displayHours}:${minutes} ${period}`;
};
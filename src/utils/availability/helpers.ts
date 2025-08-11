function timeOnly(hour: number, minute: number) {
  return new Date(1970, 0, 1, hour, minute);
}

const getDayName = (dayOfWeek: number): string => {
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  return days[dayOfWeek];
};

const ymdDateString = (date: Date) => date.toISOString().slice(0, 10); // YYYY-MM-DD

//this is because date.getDay(); returns day startnig from sun
const getDayIndexFromDate = (date: Date): number => {
  const jsDay = date.getUTCDay(); // Sunday=0 ... Saturday=6
  return (jsDay + 6) % 7; // Shift so Monday=0 ... Sunday=6
};

export {
  timeOnly,
  getDayName,
  ymdDateString,
  getDayIndexFromDate,
}

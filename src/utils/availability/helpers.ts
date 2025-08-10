function timeOnly(hour: number, minute: number) {
  return new Date(1970, 0, 1, hour, minute);
}

const getDayName = (dayOfWeek: number): string => {
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  return days[dayOfWeek];
};

const ymdDateString = (date: Date) => date.toISOString().slice(0, 10); // YYYY-MM-DD

export {
  timeOnly,
  getDayName,
  ymdDateString,
}

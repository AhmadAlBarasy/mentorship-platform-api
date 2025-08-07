function timeOnly(hour: number, minute: number) {
  return new Date(1970, 0, 1, hour, minute);
}

const getDayName = (dayOfWeek: number): string => {
  const days = ['saturday', 'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
  return days[dayOfWeek];
};

export {
  timeOnly,
  getDayName,
}

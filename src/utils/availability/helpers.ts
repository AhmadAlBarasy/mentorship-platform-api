function timeOnly(hour: number, minute: number) {
  return new Date(1970, 0, 1, hour, minute);
}

const getDayName = (dayOfWeek: number): string => {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return days[dayOfWeek];
};

export {
  timeOnly,
  getDayName,
}

function timeOnly(hour: number, minute: number) {
  return new Date(1970, 0, 1, hour, minute);
}

const getDayName = (dayOfWeek: number): string => {
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  return days[dayOfWeek];
};

export {
  timeOnly,
  getDayName,
}

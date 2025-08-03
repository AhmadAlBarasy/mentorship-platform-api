function timeOnly(hour: number, minute: number) {
  return new Date(1970, 0, 1, hour, minute);
}

export {
  timeOnly,
}


const communityJoinRequestNotificationTemplate = (userId: string): string => {
  return `Your community has pending join request from ${userId}`;
}

export {
  communityJoinRequestNotificationTemplate,
}

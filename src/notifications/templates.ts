
const communityJoinRequestNotificationTemplate = (userId: string): string => {
  return `Your community has pending join request from ${userId}`;
}

const communityJoinRequestAcceptedNotificationTemplate = (communityName: string): string => {
  return `Your request to join ${communityName} has been approved!`
}

const sessionRequestStatusUpdateNotification = (serviceType: string, mentorName: string, statusUpdate: string) => {
  return `Your session request for ${serviceType} from ${mentorName} has been ${statusUpdate}`
};

const sessionRequestReceivedNotificationTemplate = (serviceType: string, menteeName: string): string => {
  return `You received a session request for service ${serviceType} from ${menteeName}`;
};

const userReportReceivedNotificationTemplate = (reporterName: string): string => {
  return `You received a report from ${reporterName}`;
}

export {
  communityJoinRequestNotificationTemplate,
  communityJoinRequestAcceptedNotificationTemplate,
  sessionRequestStatusUpdateNotification,
  sessionRequestReceivedNotificationTemplate,
  userReportReceivedNotificationTemplate,
}

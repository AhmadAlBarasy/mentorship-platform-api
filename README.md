# Mentorship Platform - User Stories

## Types of users:

* Individuals who are willing to volunteer to help and guide (**Mentors**)
* Individuals who need mentorship (**Mentees**)
* Indiviuals who will manage communities (**Community Managers**)
* System Adminstrators (**Admins**)

## User Stories

### Authentication

* **As a** user, **I want to** Sign up to the platform using my email

* **As a** user, **I want to** Sign up using Google account

* **As a** user, **I want to** Login using credintials (email and password)

* **As a** user, **I want to** Login using Google account

* **As a** user, **I want to** Reset my password using my email

* **As a** user **I want to** be able to set up 2 factor-authentication using email **so that** it serves as an extra layer of security to protect my account

* **As a** user, **I want to** Logout from the website

### Profile & Personal Information

* **As a** user, **I want to** be able to view my profile

* **As a** user, **I want to** be able to add and edit my personal information

* **As a** user, **I want to** be able to add a personal image **so that** it adds a level of trust and authenticity to my account

* **As a** user, **I want to** have the ability to reset my password

* **As a** user, **I want to** be able to choose my timezone , **so that** all scheduled sessions and availability reflect my local time accurately

* **As a** user, **I want** to be able to report other users for violating the platform or community guidelines, **so that** it helps creating a more safe and respectful space for everyone

### User Experience

* **As a** user, **I want to** have the choice whether to use a dark or light theme **so that** I can personalize my experience

* **As a** user, **I want to** be able to upload my CV/Resume during the registration process, **so that** my information gets auto-filled and I don't have to fill them manually

### Integration

* **As a** user, **I want to** connect my Google Calendar with my account, **so that** it helps me in different scheduling and booking processes (service availability for mentors, requesting sessions for mentees) 


## Mentor Stories

* **As a** Mentor, **I want to** add the list of skills I possess **so that** that mentees seeking guidance in those skills can find me more easily

* **As a** Mentor, **I want to** create a service that I offer and set the session time for it

* **As a** Mentor, **I want to** add an availability time for a service (a weekly routine)

* **As a** Mentor, **I want to** to be able to set date-specific availability exceptions for a service (either making it available or unavailable)

* **As a** Mentor, **I want to** be able to delete a service that I created after resolving all of its session requests

* **As a** Mentor, **I want to** be able to view sessions that have been requested from me, displayed in lists categorized by serivce

* **As a** Mentor, **I want to** be able to view each session request details, **so that** I can decide whether to accept or reject it

* **As a** Mentor, **I want** the platform to show me if a session request conflicts with any events on my Google Calendar, **so that** I don't have to check for it manually

* **As a** Mentor, **I want to** have the ability to view the mentee's profile that requested the session, **so that** I can get to know them better

* **As a** Mentor, **I want to** have the ability to reject requests that don't suit me and to have the option to specify a reason for the rejection, **so that** I can be clear and transparent with mentees 

* **As a** Mentor, **I want** the platform to send an invitation to both my calendar and the mentee's for the sessions that I accept, **so that** we won't miss them

* **As a** Mentor, I **want to** be able to cancel an upcoming session I've accepted, provided there's enough time left before it starts, **so that** I can deal with urgent and unexpected situations

* **As a** Mentor, I **want to** recieve notifications when different events happen (getting a session request, a session getting canceled by a mentee, etc.)

* **As a** Mentor, I **want to** be able to view other mentors profiles

* **As a** Mentor, I **want to** be invited to join a community with an invitation link

* **As a** Mentor, I **want to** be able to leave communities


## Mentee Stories

* **As a** Mentee, **I want to** add the list of skills I possess, **so that** I can better introduce myself to others and receive recommendations for mentors that have exprience with those skills

* **As a** Mentee, **I want to** be able to search for mentors in communities and apply filters to my query (e.g., search by skills, keyword matches, etc.), **so that** I can connect with someone who can guide me in my areas of interest.

* **As a** Mentor, **I want to** have the ability to view a mentor's profile, **so that** I can get to know them better

* **As a** Mentee, **I want to** send a session request to a mentor that I opened their profile by choosing a service that the mentor offers, an available time that suits me, and providing an agenda for the session, **so that** the mentor can come prepared to the session

* **As a** Mentee, **I want to** have a page that lists the session requests that I've sent, **so that** I can check their statuses and view them

* **As a** Mentee, **I want to** be able to cancel a session request that I've sent if it's still in a 'pending' state

* **As a** Mentee, **I want to** be able to edit a session request details if it's still in a 'pending' state

* **As a** Mentee, I **want to** be invited to join a community with an invitation link

* **As a** Mentee, I **want to** be able to leave communities

* **As a** Mentee, I **want to** recieve notifications when different events happen (a session request status gets accepted, rejected, canceled, etc.)


## Community Manager Stories

* **As a** Community Manager, **I want to** have the ability to edit the community details (Name, image, description, etc.)

* **As a** Community Manager, **I want to** be able to generate an invitation link, **so that** mentees and mentors can join the community

* **As a** Community Manager, **I want to** be able to rotate the invitation link, **so that** I deactivate a previous leaked link

* **As a** Community Manager, **I want to** remove community members who violates the community guidelines, **so that** I can maintain a safe and welcoming space for others

* **As a** Community Manager, **I want to** have a dashboard that shows key information and statistics about the community (number of members, average session times), **so that** I can better understand and support the community

## Admin Stories

* **As an** Admin, **I want to** to view user reports, **so that** I can make a decision about the action to take regarding the reported user

* **As an** Admin, **I want to** to be able to view user reports, **so that** I can make a decision about the action to take regarding the offending user

* **As an** Admin, **I want to** ban users who violated community or platform guidelines, **so that** I can maintain a safe environment for everyone

* **As an** Admin, **I want to** lift the ban on users that appealed or if they were mistakenly banned

* **As an** Admin, **I want to** have a dashboard that shows general statistics about the platform, **so that** I can gain informative insights to support decision-making

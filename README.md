# Express-boilerplate
a starter project to save you the hustle of setting up your project each time you are building the next big thing :>
## Table of contents:
- [Overview](#overview)
- [Installation](#installation-and-usage)
- [Features](#features)
- [Contribution](#contribution)
## Overview
This project is here to save you lots of time setting up your next express RESTful API project, this project takes off your shoulders the following repetitive tasks:
* Creating the folder structure
* Setting up necessary middlewares (security, requests parsing, etc...)
* Configuring TypeScript
* Setting up loggers for your API
* Creating a centralized error-handling mechanism
* Implementing an input sanitization and validation middleware
* And more will added in future updates!
## Installation and usage
This project is a template, click on the `Use this template` button to create your copy of this repository into a new one. 
### Manual Installation
* Clone this repo:
```bash
git clone https://github.com/AhmadAlBarasy/express-boilerplate.git
```
* Delete the `.git` folder and initialize git for your project
* Create a folder named `config` and add your environment variables inside a `.env` file
* Configure `package.json` and `package-lock.json` and you are ready to go!

## Features
* **MVC Folder Structure:** This project is designed to serve as the base for building RESTful APIs following the MVC architectural design pattern.
* **TypeScript:** It uses TypeScript to add static typing and improve code reliability.
* **Centralized Error handler:** It uses the express global error handler middleware to centralize error handling, it features a class called [APIError](https://github.com/AhmadAlBarasy/express-boilerplate/blob/main/src/types/classes/APIError.ts)
which holds the status code of an error and the error's message, the `APIError` class extends the `Error` class which means you can use it to call the `next()` function in express to pass errors into the global error handler
* **No need for try-catch:** To handle errors that occur in async functions, use the `asyncErrorHandler` function to wrap your async function. This will chain a `.catch()` call into your async function and pass the errors into the global error handler.
* **Request Validation Middleware:** It features a middleware function called `validate` which can be used to validate and sanitize user input into the `req.body` or `req.params`, you can pass an object to the `validate` function that accepts two optional parameters of type `ObjectSchema` from Joi :
`bodySchema` or `paramsSchema`
* **Integrated logging mechanism:** It uses `winston` and `morgan` to create a logger that logs HTTP requests into a log file called `http.log`, it also comes with a logger that you can import and use all over your express application to write your needed logs,
if the project is not in a production environment `NODE_ENV !== 'production'` it will also log HTTP requests and app logs into the console, you can customize the logging format, the severity levels used, and basically anything you want based on your project needs
## Contribution
If want to help me make this project as good and beneficial as possible, check out [CONTRIBUTING.MD](https://github.com/AhmadAlBarasy/express-boilerplate/blob/main/CONTRIBUTING.md)

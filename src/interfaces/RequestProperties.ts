interface RequestBody { [key: string]: string | number | object };
interface RequestParams { [key: string]: string | number };
interface RequestQuery { [key: string]: any };

export type RequestProperties = RequestBody | RequestParams | RequestQuery;

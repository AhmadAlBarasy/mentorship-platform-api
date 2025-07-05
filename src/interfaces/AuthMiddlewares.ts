
type accessType = 'partial' | 'full' | '*';

interface AuthenticationOptions {
  access: accessType;
}

export { AuthenticationOptions };

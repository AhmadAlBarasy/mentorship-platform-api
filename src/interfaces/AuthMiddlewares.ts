
type accessType = 'partial' | 'full' | '*';

interface AuthenticationOptions {
  access: accessType;
  allowBanned?: boolean;
}

export { AuthenticationOptions };

export function nanoid(size = 21): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let id = ''
  
  for (let i = 0; i < size; i++) {
    id += alphabet.charAt(Math.floor(Math.random() * alphabet.length))
  }
  
  return id
}

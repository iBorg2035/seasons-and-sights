/**
 * A counter that moves every time the signed-in traveler leaves.
 *
 * A sync that started before sign-out can resolve after the device has been
 * cleared — auth-js doesn't serialize requests behind /logout, so a GET sent
 * a moment earlier still carries the old token — and its local write would
 * put the account's trips back on the signed-out device. Every async path
 * that writes synced data locally captures the epoch before its first await
 * and drops the write if it moved.
 */
let epoch = 0;

export function sessionEpoch(): number {
  return epoch;
}

export function endSessionEpoch(): void {
  epoch += 1;
}

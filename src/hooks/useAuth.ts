import { useMutation } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import * as authService from "../services/auth.service";
import type { User } from "../types";

export function useLogin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ username, password }: { username: string; password: string }) =>
      authService.login(username, password),
    onSuccess: (data) => {
      qc.setQueryData(["current-user"], data.user);
    },
  });
}

export function useLogout() {
  const qc = useQueryClient();
  return () => {
    authService.logout();
    qc.clear();
  };
}

export function useCurrentUser() {
  const user = authService.getStoredUser();
  return user;
}

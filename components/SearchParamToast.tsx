"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

interface Props {
  param: string;
  message: string;
}

export default function SearchParamToast({ param, message }: Props) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (searchParams.get(param) !== "true") return;
    setVisible(true);
    const params = new URLSearchParams(searchParams.toString());
    params.delete(param);
    router.replace(`?${params.toString()}`, { scroll: false });
    const timer = setTimeout(() => setVisible(false), 3000);
    return () => clearTimeout(timer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!visible) return null;

  return (
    <div className="toast toast-end toast-bottom z-50">
      <div className="alert alert-success">
        <span>{message}</span>
      </div>
    </div>
  );
}

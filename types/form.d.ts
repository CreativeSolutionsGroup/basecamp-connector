export interface Form {
  id: string;
  info: { title: string };
  items: FormItem[];
}

export interface FormItem {
  id: string;
  title: string;
  type: string;
}
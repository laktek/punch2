function formattedDate(epoch: number) {
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "long" }).format(
    new Date(epoch),
  );
}

export default formattedDate;

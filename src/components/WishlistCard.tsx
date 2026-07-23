import Link from "next/link";

export default function WishlistCard({
  id,
  title,
  description,
  slug,
}: {
  id: string;
  title: string;
  description?: string | null;
  slug: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-gray-200 p-4 dark:border-gray-800">
      <div>
        <Link href={`/wishlists/${id}`} className="font-medium hover:underline">
          {title}
        </Link>
        {description && <p className="text-sm text-gray-500">{description}</p>}
      </div>
      <Link
        href={`/w/${slug}`}
        target="_blank"
        className="text-sm text-gray-500 hover:underline"
      >
        View share link
      </Link>
    </div>
  );
}

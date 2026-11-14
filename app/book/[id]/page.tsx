import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getFirestore } from 'firebase-admin/firestore';
import { getAdminApp } from '@/lib/firebase/admin';
import { getAuthedUser } from '@/lib/firebase/server';
import SectionStatusBadge from '@/components/SectionStatusBadge';

type Section = {
  id: string;
  sectionNumber: number;
  status: string;
};

export default async function BookDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const user = await getAuthedUser();

  if (!user) {
    redirect('/login');
  }

  const db = getFirestore(getAdminApp());
  const bookRef = db.collection('books').doc(id);
  const bookSnap = await bookRef.get();
  const bookData = bookSnap.data() as { userId: string; title: string; author?: string | null } | undefined;

  if (!bookSnap.exists || !bookData || bookData.userId !== user.uid) {
    notFound();
  }

  const sectionsSnapshot = await bookRef.collection('sections').orderBy('sectionNumber', 'asc').get();
  const sections: Section[] = sectionsSnapshot.docs.map((doc) => {
    const data = doc.data() as { sectionNumber: number; status: string };
    return { id: doc.id, sectionNumber: data.sectionNumber, status: data.status };
  });

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col px-4 py-8">
      <h1 className="mb-1 text-2xl font-semibold">{bookData.title}</h1>
      {bookData.author && <p className="mb-6 text-sm text-gray-600">by {bookData.author}</p>}

      {sections.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {sections.map((section) => {
            const label = `Section ${section.sectionNumber}`;

            let href: string | null = null;
            if (section.status === 'ready_to_practice') {
              href = `/book/${id}/practice/${section.sectionNumber}`;
            } else if (section.status === 'ready_to_read' || section.status === 'completed') {
              href = `/book/${id}/read/${section.sectionNumber}`;
            }

            return (
              <li
                key={section.id}
                className="flex items-center justify-between rounded border px-3 py-2"
              >
                {href ? (
                  <Link href={href} className="font-medium hover:underline">
                    {label}
                  </Link>
                ) : (
                  <span className="font-medium text-gray-500">{label}</span>
                )}
                <SectionStatusBadge status={section.status} />
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-sm text-gray-600">This book has no sections yet.</p>
      )}
    </main>
  );
}

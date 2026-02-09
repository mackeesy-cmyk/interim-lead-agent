import { NextRequest, NextResponse } from 'next/server';
import { updateCaseFile } from '@/lib/airtable';

export async function POST(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        // Addendum §5: Relevant / Delvis relevant / Ikke relevant
        const grade = searchParams.get('grade') as 'Relevant' | 'Delvis' | 'Ikke' | null;

        if (!id || !grade || !['Relevant', 'Delvis', 'Ikke'].includes(grade)) {
            return NextResponse.json(
                { error: 'Invalid parameters' },
                { status: 400 }
            );
        }

        // Update the case file with feedback
        await updateCaseFile(id, {
            feedback_grade: grade,
        });

        console.log(`✅ Feedback registered: Lead ${id} graded as ${grade}`);

        // Redirect back to home page
        return NextResponse.redirect(new URL('/', request.url));
    } catch (error) {
        console.error('❌ Feedback error:', error);
        return NextResponse.json(
            { error: 'Failed to save feedback' },
            { status: 500 }
        );
    }
}

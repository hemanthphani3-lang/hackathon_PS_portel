import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

console.log('Testing connection to:', url);

const supabase = createClient(url!, key!);

async function test() {
    try {
        const { data, error } = await supabase.from('problem_statements').select('count', { count: 'exact', head: true });
        if (error) {
            console.error(' Supabase error:', error.message);
        } else {
            console.log(' Success! Connection established.');
        }
    } catch (err) {
        console.error(' Network error:', err.message);
    }
}

test();

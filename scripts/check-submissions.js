const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://qajbticeqivhbvakmsby.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFhamJ0aWNlcWl2aGJ2YWttc2J5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4MTc2NjYsImV4cCI6MjA4NDM5MzY2Nn0.PyLVLW_k3-wahT17Ngjj7JEy_OGDs9UrUyKzMamqlsQ';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkSubmissions() {
    console.log('Checking submissions...');
    const { data, error } = await supabase.from('submissions').select('id, handled_by').not('handled_by', 'is', null);
    if (error) {
        console.error('Error:', error.message);
    } else {
        console.log('Submissions with handlers:', data);
    }
}

checkSubmissions();

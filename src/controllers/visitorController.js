const supabase = require('../../config/supabase');

const handleVisitorView = async (req, res) => {
  const { visitor } = req.body;

  try {
    const { data: existingVisitor, error: visitorError } = await supabase
      .from('Visitors')
      .select('*')
      .eq('visitor_id', visitor)
      .single();

    if (visitorError && visitorError.code !== 'PGRST116') {
      throw visitorError;
    }

    if (existingVisitor) {
      const lastVisitTime = new Date(existingVisitor.visit_time);
      const currentTime = new Date();
      const timeDifference = (currentTime - lastVisitTime) / (1000 * 60 * 60 * 24); // Gün

      if (timeDifference > 1) {
        const { error: updateError } = await supabase
          .from('Visitors')
          .update({ view: existingVisitor.view + 1, visit_time: currentTime })
          .eq('visitor_id', visitor);

        if (updateError) {
          throw updateError;
        }
      }
    } else {
      const { error: insertError } = await supabase
        .from('Visitors')
        .insert([{ visitor_id: visitor, visit_time: new Date(), view: 1 }]);

      if (insertError) {
        throw insertError;
      }
    }

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ message: 'Operation successful' });

  } catch (error) {
    console.error('Error processing view:', error);
    res.setHeader('Cache-Control', 'no-store');
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

const getAllViews = async (req, res) => {
    try {
      const { data, error } = await supabase
        .from("Visitors")
        .select("*");
  
      if (error) {
        return res.status(500).json({
          success: false,
          message: "Görüntülenme verileri alınırken hata oluştu",
          error: error.message,
        });
      }
  
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json({ success: true, content: data });
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Sunucu hatası oluştu",
        error: err.message,
      });
    }
};

module.exports = { handleVisitorView, getAllViews };
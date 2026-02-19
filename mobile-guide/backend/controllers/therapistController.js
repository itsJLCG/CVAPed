const User = require('../models/User');

// @desc    Get therapist reports/analytics
// @route   GET /api/therapist/reports
// @access  Private (Therapist only)
exports.getReports = async (req, res) => {
  console.log('\n=== GET THERAPIST REPORTS REQUEST STARTED ===');
  
  try {
    // Check if user is therapist
    if (req.user.role !== 'therapist' && req.user.role !== 'admin') {
      console.log('❌ User is not a therapist or admin');
      return res.status(403).json({
        success: false,
        message: 'Unauthorized. Therapist access required.'
      });
    }

    console.log('📊 Calculating therapist reports...');

    // Get all patients (users with role 'patient')
    const patients = await User.find({ role: 'patient' }).select('age gender');
    
    const totalPatients = patients.length;

    if (totalPatients === 0) {
      console.log('ℹ️ No patients found');
      return res.status(200).json({
        success: true,
        data: {
          totalPatients: 0,
          ageBrackets: [],
          genderDistribution: [],
          highestAgeBracket: null
        }
      });
    }

    // Age bracket analysis
    const ageBrackets = [
      { range: '0-12', min: 0, max: 12, count: 0 },
      { range: '13-17', min: 13, max: 17, count: 0 },
      { range: '18-24', min: 18, max: 24, count: 0 },
      { range: '25-34', min: 25, max: 34, count: 0 },
      { range: '35-44', min: 35, max: 44, count: 0 },
      { range: '45-54', min: 45, max: 54, count: 0 },
      { range: '55-64', min: 55, max: 64, count: 0 },
      { range: '65+', min: 65, max: 999, count: 0 }
    ];

    // Gender distribution
    const genderCounts = {
      male: 0,
      female: 0,
      other: 0,
      'prefer-not-to-say': 0,
      unknown: 0
    };

    // Count patients by age brackets and gender
    patients.forEach(patient => {
      // Age bracket counting
      if (patient.age) {
        const age = patient.age;
        for (let bracket of ageBrackets) {
          if (age >= bracket.min && age <= bracket.max) {
            bracket.count++;
            break;
          }
        }
      }

      // Gender counting
      if (patient.gender && genderCounts.hasOwnProperty(patient.gender)) {
        genderCounts[patient.gender]++;
      } else {
        genderCounts.unknown++;
      }
    });

    // Calculate percentages for age brackets
    const ageBracketsWithPercentage = ageBrackets.map(bracket => ({
      range: bracket.range,
      count: bracket.count,
      percentage: totalPatients > 0 ? Math.round((bracket.count / totalPatients) * 100) : 0
    }));

    // Find highest age bracket
    const highestAgeBracket = ageBracketsWithPercentage.reduce((highest, current) => 
      current.count > highest.count ? current : highest
    );

    // Mark highest bracket
    const ageBracketsWithHighest = ageBracketsWithPercentage.map(bracket => ({
      ...bracket,
      isHighest: bracket.range === highestAgeBracket.range && bracket.count > 0
    }));

    // Format gender distribution
    const genderDistribution = [
      { 
        gender: 'Male', 
        count: genderCounts.male,
        percentage: totalPatients > 0 ? Math.round((genderCounts.male / totalPatients) * 100) : 0
      },
      { 
        gender: 'Female', 
        count: genderCounts.female,
        percentage: totalPatients > 0 ? Math.round((genderCounts.female / totalPatients) * 100) : 0
      },
      { 
        gender: 'Other', 
        count: genderCounts.other,
        percentage: totalPatients > 0 ? Math.round((genderCounts.other / totalPatients) * 100) : 0
      },
      { 
        gender: 'Prefer not to say', 
        count: genderCounts['prefer-not-to-say'],
        percentage: totalPatients > 0 ? Math.round((genderCounts['prefer-not-to-say'] / totalPatients) * 100) : 0
      }
    ].filter(item => item.count > 0); // Only include genders that have patients

    // Add unknown gender if there are patients without gender info
    if (genderCounts.unknown > 0) {
      genderDistribution.push({
        gender: 'Unknown',
        count: genderCounts.unknown,
        percentage: totalPatients > 0 ? Math.round((genderCounts.unknown / totalPatients) * 100) : 0
      });
    }

    console.log('✅ Therapist reports calculated successfully');
    console.log(`Total patients: ${totalPatients}`);
    console.log(`Highest age bracket: ${highestAgeBracket.range} (${highestAgeBracket.count} patients)`);

    res.status(200).json({
      success: true,
      data: {
        totalPatients,
        ageBrackets: ageBracketsWithHighest,
        genderDistribution,
        highestAgeBracket: highestAgeBracket.range
      }
    });

  } catch (error) {
    console.error('❌ GET THERAPIST REPORTS ERROR:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get therapist reports',
      error: error.message
    });
  }
  
  console.log('=== GET THERAPIST REPORTS REQUEST ENDED ===\n');
};
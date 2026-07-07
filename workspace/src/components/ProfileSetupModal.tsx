import React from "react";

interface Props {
  open: boolean;
  profileForm: any;
  setProfileForm: React.Dispatch<React.SetStateAction<any>>;
  onSave: () => void;
}

export default function ProfileSetupModal({
  open,
  profileForm,
  setProfileForm,
  onSave,
}: Props) {

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto p-8">

        <h2 className="text-2xl font-bold">
          Complete Your Profile
        </h2>

        <p className="text-gray-500 mb-6">
          This information will appear on your quotations, invoices and client portal.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

  <div>
    <label className="text-sm font-medium">Company Name *</label>
    <input
      className="w-full border rounded-xl p-3 mt-1"
      value={profileForm.companyName}
      onChange={(e)=>
        setProfileForm({...profileForm,companyName:e.target.value})
      }
    />
  </div>

  <div>
    <label className="text-sm font-medium">Owner Name *</label>
    <input
      className="w-full border rounded-xl p-3 mt-1"
      value={profileForm.ownerName}
      onChange={(e)=>
        setProfileForm({...profileForm,ownerName:e.target.value})
      }
    />
  </div>

  <div>
    <label className="text-sm font-medium">Mobile Number *</label>
    <input
      className="w-full border rounded-xl p-3 mt-1"
      value={profileForm.mobile}
      onChange={(e)=>
        setProfileForm({...profileForm,mobile:e.target.value})
      }
    />
  </div>

  <div>
    <label className="text-sm font-medium">Email</label>
    <input
      className="w-full border rounded-xl p-3 mt-1 bg-gray-100"
      value={profileForm.email}
      readOnly
    />
  </div>

  <div>
    <label className="text-sm font-medium">GST Number</label>
    <input
      className="w-full border rounded-xl p-3 mt-1"
      value={profileForm.gstNumber}
      onChange={(e)=>
        setProfileForm({...profileForm,gstNumber:e.target.value})
      }
    />
  </div>

  <div>
    <label className="text-sm font-medium">Pincode</label>
    <input
      className="w-full border rounded-xl p-3 mt-1"
      value={profileForm.pincode}
      onChange={(e)=>
        setProfileForm({...profileForm,pincode:e.target.value})
      }
    />
  </div>

  <div>
    <label className="text-sm font-medium">City</label>
    <input
      className="w-full border rounded-xl p-3 mt-1"
      value={profileForm.city}
      onChange={(e)=>
        setProfileForm({...profileForm,city:e.target.value})
      }
    />
  </div>

  <div>
    <label className="text-sm font-medium">State</label>
    <input
      className="w-full border rounded-xl p-3 mt-1"
      value={profileForm.state}
      onChange={(e)=>
        setProfileForm({...profileForm,state:e.target.value})
      }
    />
  </div>

</div>

<div className="mt-4">
  <label className="text-sm font-medium">Company Address</label>
  <textarea
    rows={3}
    className="w-full border rounded-xl p-3 mt-1"
    value={profileForm.address}
    onChange={(e)=>
      setProfileForm({...profileForm,address:e.target.value})
    }
  />
</div>

<button
  onClick={onSave}
  className="w-full mt-6 rounded-xl bg-blue-600 text-white p-3 font-semibold"
>
  Save & Continue
</button>

       

      </div>
    </div>
  );
}
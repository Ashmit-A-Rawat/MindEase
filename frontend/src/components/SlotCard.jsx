export default function SlotCard({ slot, onAction, actionLabel }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h2 className="font-bold text-gray-900">{slot.counsellorName}</h2>
          <p className="text-sm text-gray-500">
            {new Date(slot.date).toLocaleDateString()} at {slot.time}
          </p>
        </div>
        {slot.isBooked ? (
          <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
            Booked
          </span>
        ) : (
          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
            Available
          </span>
        )}
      </div>
      
      <div className="flex items-center text-sm text-gray-600 mb-2">
        <span className="w-2 h-2 bg-gray-400 rounded-full mr-2"></span>
        Mode: {slot.mode}
      </div>
      
      <p className="text-sm text-gray-600 mb-3">
        {slot.mode === 'Online' ? 'Meeting Link: ' : 'Location: '}
        {slot.mode === 'Online' ? slot.meetingLink : slot.location}
      </p>
      
      {!slot.isBooked && actionLabel && (
        <button
          onClick={() => onAction(slot)}
          className="mt-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700 transition-colors"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
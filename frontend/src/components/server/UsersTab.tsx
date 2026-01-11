

const UsersTab = () => {
    return (
        <div className="bg-[#161b22] border border-white/10 rounded-xl p-12 text-center">
            <h3 className="text-gray-400 text-lg mb-4">It looks like you don't have any subusers.</h3>

            <button className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg font-bold transition">
                New User
            </button>
            <p className="mt-4 text-xs text-gray-500">Subuser management is coming soon.</p>
        </div>
    );
};

export default UsersTab;
